import csv

#This converts Gavin's HCA format, printed output needs to be transferred into input.yml if important

input="./data/FormattedData2/HCA/HCA-metadata.csv"
output=input.replace(".csv", "_fixed.csv")

with open(input, "r") as f1:
    inputData = list(csv.reader(f1, delimiter =","))
    outputData = [list() for _ in inputData]

    i = 0
    while i < len(inputData[0]):
        if(inputData[0][i].endswith("_color")): #color, order, label
            colors = [row[i] for row in inputData[1:]]
            orders = [row[i+1] for row in inputData[1:]]
            labels = [row[i+2] for row in inputData[1:]]
            zipped = list(filter(lambda item: item[1], sorted(zip(orders, labels, colors))))  
            unique = sorted(set(zipped))
            
            #Print name
            name = inputData[0][i][:-6]
            print(name)

            #Print unique labels sorted
            print([x[1] for x in unique])

            #Print corresponding colors
            print([x[2] for x in unique])

            outputData[0].append(name)
            for j in range(len(inputData)-1):
                outputData[j+1].append(labels[j])

            i += 3
        else:
            for j in range(len(inputData)):
                outputData[j].append(inputData[j][i])
            i += 1

    with open(output, "w", newline="") as f2:
        writer = csv.writer(f2, delimiter =",", quoting=csv.QUOTE_MINIMAL)
        writer.writerows(outputData)

        print(outputData[0])

